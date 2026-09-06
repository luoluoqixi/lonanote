#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>
#include <limits.h>

#import "LonanoteResourceGateway.h"

static NSString *const LNNResourceScheme = @"lonanote-resource";
static NSString *const LNNResourceHost = @"resource";

@interface LNNResourceRequest : NSObject
@property(nonatomic, copy) NSString *scopeID;
@property(nonatomic, assign) unsigned long long generation;
@property(nonatomic, copy) NSString *path;
@property(nonatomic, strong, nullable) NSDictionary<NSString *, NSNumber *> *range;
@property(nonatomic, copy, nullable) NSString *ifNoneMatch;
@end

@implementation LNNResourceRequest
@end

@interface LNNResourceTaskContext : NSObject
@property(nonatomic, assign) BOOL cancelled;
@property(nonatomic, assign) uint64_t handleID;
@end

@implementation LNNResourceTaskContext
@end

/// 将 WKURLSchemeTask 适配到 Rust Resource Gateway，资源字节不经过 React Native bridge。
@interface LonanoteResourceSchemeHandler : NSObject <WKURLSchemeHandler>
@end

@implementation LonanoteResourceSchemeHandler {
  dispatch_queue_t _resourceQueue;
  NSMutableDictionary<NSValue *, LNNResourceTaskContext *> *_contexts;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _resourceQueue = dispatch_queue_create("app.lonanote.resource-scheme", DISPATCH_QUEUE_SERIAL);
    _contexts = [NSMutableDictionary dictionary];
  }
  return self;
}

- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
  (void)webView;
  LNNResourceTaskContext *context = [LNNResourceTaskContext new];
  NSValue *key = [NSValue valueWithNonretainedObject:urlSchemeTask];
  @synchronized(self) {
    _contexts[key] = context;
  }

  dispatch_async(_resourceQueue, ^{
    [self processTask:urlSchemeTask key:key context:context];
  });
}

- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
  (void)webView;
  NSValue *key = [NSValue valueWithNonretainedObject:urlSchemeTask];
  LNNResourceTaskContext *context = nil;
  @synchronized(self) {
    context = _contexts[key];
    [_contexts removeObjectForKey:key];
  }
  if (context == nil) {
    return;
  }
  @synchronized(context) {
    context.cancelled = YES;
  }
  [self closeContext:context];
}

- (void)processTask:(id<WKURLSchemeTask>)task
                 key:(NSValue *)key
             context:(LNNResourceTaskContext *)context {
  LNNResourceRequest *request = [self parseRequest:task.request];
  if (request == nil) {
    [self respondWithStatus:400 toTask:task key:key context:context];
    return;
  }

  NSDictionary *response = [self openRequest:request];
  if (response == nil) {
    [self respondWithStatus:500 toTask:task key:key context:context];
    return;
  }

  NSInteger status = [response[@"status"] integerValue];
  NSDictionary *headers = [response[@"headers"] isKindOfClass:[NSDictionary class]]
      ? response[@"headers"]
      : nil;
  NSNumber *handleID = [response[@"handleId"] isKindOfClass:[NSNumber class]]
      ? response[@"handleId"]
      : nil;
  if (handleID != nil) {
    @synchronized(context) {
      if (!context.cancelled) {
        context.handleID = handleID.unsignedLongLongValue;
      }
    }
  }

  if ([self isCancelled:context]) {
    [self closeContext:context];
    [self removeContextForKey:key context:context];
    return;
  }

  NSHTTPURLResponse *httpResponse = [self httpResponseForURL:task.request.URL
                                                       status:status
                                                      headers:headers
                                                 totalLength:response[@"totalLength"]];
  if (![self deliverResponse:httpResponse toTask:task context:context]) {
    [self closeContext:context];
    [self removeContextForKey:key context:context];
    return;
  }

  if (status != 200 && status != 206) {
    [self finishTask:task key:key context:context error:nil];
    return;
  }
  if (handleID == nil || handleID.unsignedLongLongValue == 0) {
    [self finishTask:task
                  key:key
              context:context
                error:[NSError errorWithDomain:NSURLErrorDomain
                                           code:NSURLErrorCannotDecodeContentData
                                       userInfo:nil]];
    return;
  }

  while (![self isCancelled:context]) {
    uint8_t *bytes = nullptr;
    size_t length = 0;
    int32_t readResult = lonanote_resource_read_next(handleID.unsignedLongLongValue, &bytes, &length);
    if (readResult == 0) {
      [self finishTask:task key:key context:context error:nil];
      return;
    }
    if (readResult != 1 || bytes == nullptr) {
        [self finishTask:task
                    key:key
                context:context
                  error:[NSError errorWithDomain:NSURLErrorDomain
                                             code:NSURLErrorCannotDecodeContentData
                                         userInfo:nil]];
      return;
    }

    NSData *chunk = [NSData dataWithBytes:bytes length:length];
    lonanote_resource_free_bytes(bytes, length);
    if (![self deliverData:chunk toTask:task context:context]) {
      [self closeContext:context];
      [self removeContextForKey:key context:context];
      return;
    }
  }

  [self closeContext:context];
  [self removeContextForKey:key context:context];
}

- (nullable LNNResourceRequest *)parseRequest:(NSURLRequest *)request {
  NSURL *url = request.URL;
  if (![url.scheme.lowercaseString isEqualToString:LNNResourceScheme]
      || ![url.host.lowercaseString isEqualToString:LNNResourceHost]) {
    return nil;
  }

  NSURLComponents *components = [NSURLComponents componentsWithURL:url resolvingAgainstBaseURL:NO];
  NSString *encodedPath = components.percentEncodedPath;
  NSArray<NSString *> *segments = [encodedPath componentsSeparatedByString:@"/"];
  if (segments.count < 4 || ![segments.firstObject isEqualToString:@""]) {
    return nil;
  }
  for (NSUInteger index = 1; index < segments.count; index += 1) {
    if (segments[index].length == 0) {
      return nil;
    }
  }

  NSString *scopeID = segments[1];
  if ([scopeID containsString:@"%"] || [scopeID containsString:@"\\"]) {
    return nil;
  }
  unsigned long long generation = 0;
  NSScanner *generationScanner = [NSScanner scannerWithString:segments[2]];
  if (![generationScanner scanUnsignedLongLong:&generation]
      || !generationScanner.isAtEnd || generation == 0) {
    return nil;
  }

  NSMutableArray<NSString *> *decodedPath = [NSMutableArray arrayWithCapacity:segments.count - 3];
  for (NSUInteger index = 3; index < segments.count; index += 1) {
    NSString *segment = [self decodePathSegment:segments[index]];
    if (segment == nil) {
      return nil;
    }
    [decodedPath addObject:segment];
  }

  NSString *rangeHeader = [request valueForHTTPHeaderField:@"Range"];
  NSDictionary<NSString *, NSNumber *> *range = [self parseRange:rangeHeader];
  if (rangeHeader != nil && range == nil) {
    return nil;
  }

  LNNResourceRequest *resourceRequest = [LNNResourceRequest new];
  resourceRequest.scopeID = scopeID;
  resourceRequest.generation = generation;
  resourceRequest.path = [decodedPath componentsJoinedByString:@"/"];
  resourceRequest.range = range;
  NSString *ifNoneMatch = [request valueForHTTPHeaderField:@"If-None-Match"];
  resourceRequest.ifNoneMatch = ifNoneMatch.length > 0 ? ifNoneMatch : nil;
  return resourceRequest;
}

- (nullable NSString *)decodePathSegment:(NSString *)segment {
  NSString *decoded = segment.stringByRemovingPercentEncoding;
  if (decoded.length == 0 || [decoded containsString:@"/"] || [decoded containsString:@"\\"]
      || [decoded containsString:@"%"] || [decoded isEqualToString:@"."]
      || [decoded isEqualToString:@".."] || [self containsControlCharacter:decoded]) {
    return nil;
  }
  return decoded;
}

- (BOOL)containsControlCharacter:(NSString *)value {
  NSCharacterSet *controls = NSCharacterSet.controlCharacterSet;
  return [value rangeOfCharacterFromSet:controls].location != NSNotFound;
}

- (nullable NSDictionary<NSString *, NSNumber *> *)parseRange:(nullable NSString *)value {
  if (value == nil) {
    return nil;
  }
  if (![value hasPrefix:@"bytes="]) {
    return nil;
  }
  NSString *range = [value substringFromIndex:@"bytes=".length];
  if ([range containsString:@","]) {
    return nil;
  }
  NSArray<NSString *> *parts = [range componentsSeparatedByString:@"-"];
  if (parts.count != 2 || parts[0].length == 0) {
    return nil;
  }
  unsigned long long start = 0;
  NSScanner *startScanner = [NSScanner scannerWithString:parts[0]];
  if (![startScanner scanUnsignedLongLong:&start] || !startScanner.isAtEnd) {
    return nil;
  }
  unsigned long long endInclusive = ULLONG_MAX;
  if (parts[1].length > 0) {
    NSScanner *endScanner = [NSScanner scannerWithString:parts[1]];
    if (![endScanner scanUnsignedLongLong:&endInclusive] || !endScanner.isAtEnd) {
      return nil;
    }
  }
  if (endInclusive < start) {
    return nil;
  }
  return @{ @"start" : @(start), @"endInclusive" : @(endInclusive) };
}

- (nullable NSDictionary *)openRequest:(LNNResourceRequest *)request {
  NSMutableDictionary *payload = [@{
    @"scopeId" : request.scopeID,
    @"generation" : @(request.generation),
    @"path" : request.path,
  } mutableCopy];
  if (request.range != nil) {
    payload[@"range"] = request.range;
  }
  if (request.ifNoneMatch != nil) {
    payload[@"ifNoneMatch"] = request.ifNoneMatch;
  }
  NSError *serializationError = nil;
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:&serializationError];
  if (data == nil || serializationError != nil) {
    return nil;
  }
  NSString *payloadJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  char *rawResponse = lonanote_resource_open(payloadJSON.UTF8String);
  if (rawResponse == nullptr) {
    return nil;
  }
  NSString *responseJSON = [NSString stringWithUTF8String:rawResponse];
  lonanote_resource_free_string(rawResponse);
  if (responseJSON == nil) {
    return nil;
  }
  NSData *responseData = [responseJSON dataUsingEncoding:NSUTF8StringEncoding];
  id response = [NSJSONSerialization JSONObjectWithData:responseData options:0 error:nil];
  return [response isKindOfClass:[NSDictionary class]] ? response : nil;
}

- (NSHTTPURLResponse *)httpResponseForURL:(NSURL *)url
                                   status:(NSInteger)status
                                  headers:(nullable NSDictionary *)headers
                             totalLength:(nullable NSNumber *)totalLength {
  NSMutableDictionary<NSString *, NSString *> *responseHeaders = [NSMutableDictionary dictionary];
  responseHeaders[@"Accept-Ranges"] = @"bytes";
  if ([headers[@"contentType"] isKindOfClass:[NSString class]]) {
    responseHeaders[@"Content-Type"] = headers[@"contentType"];
  }
  if ([headers[@"contentLength"] isKindOfClass:[NSNumber class]]) {
    responseHeaders[@"Content-Length"] = [headers[@"contentLength"] stringValue];
  } else {
    responseHeaders[@"Content-Length"] = @"0";
  }
  if ([headers[@"etag"] isKindOfClass:[NSString class]]) {
    responseHeaders[@"ETag"] = headers[@"etag"];
  }
  if ([headers[@"cacheControl"] isKindOfClass:[NSString class]]) {
    responseHeaders[@"Cache-Control"] = headers[@"cacheControl"];
  }
  NSDictionary *range = [headers[@"contentRange"] isKindOfClass:[NSDictionary class]]
      ? headers[@"contentRange"]
      : nil;
  if ([range[@"start"] isKindOfClass:[NSNumber class]]
      && [range[@"endInclusive"] isKindOfClass:[NSNumber class]]
      && [headers[@"totalLength"] isKindOfClass:[NSNumber class]]) {
    responseHeaders[@"Content-Range"] = [NSString stringWithFormat:@"bytes %@-%@/%@",
        range[@"start"], range[@"endInclusive"], headers[@"totalLength"]];
  } else if (status == 416 && [totalLength isKindOfClass:[NSNumber class]]) {
    responseHeaders[@"Content-Range"] = [NSString stringWithFormat:@"bytes */%@", totalLength];
  }
  return [[NSHTTPURLResponse alloc] initWithURL:url
                                      statusCode:status
                                     HTTPVersion:@"HTTP/1.1"
                                    headerFields:responseHeaders];
}

- (BOOL)isCancelled:(LNNResourceTaskContext *)context {
  @synchronized(context) {
    return context.cancelled;
  }
}

- (void)closeContext:(LNNResourceTaskContext *)context {
  uint64_t handleID = 0;
  @synchronized(context) {
    handleID = context.handleID;
    context.handleID = 0;
  }
  if (handleID != 0) {
    lonanote_resource_close(handleID);
  }
}

- (BOOL)deliverResponse:(NSHTTPURLResponse *)response
                 toTask:(id<WKURLSchemeTask>)task
                context:(LNNResourceTaskContext *)context {
  __block BOOL delivered = NO;
  dispatch_sync(dispatch_get_main_queue(), ^{
    if (![self isCancelled:context]) {
      [task didReceiveResponse:response];
      delivered = YES;
    }
  });
  return delivered;
}

- (BOOL)deliverData:(NSData *)data
             toTask:(id<WKURLSchemeTask>)task
            context:(LNNResourceTaskContext *)context {
  __block BOOL delivered = NO;
  dispatch_sync(dispatch_get_main_queue(), ^{
    if (![self isCancelled:context]) {
      [task didReceiveData:data];
      delivered = YES;
    }
  });
  return delivered;
}

- (void)respondWithStatus:(NSInteger)status
                  toTask:(id<WKURLSchemeTask>)task
                     key:(NSValue *)key
                 context:(LNNResourceTaskContext *)context {
  NSHTTPURLResponse *response = [self httpResponseForURL:task.request.URL
                                                   status:status
                                                  headers:nil
                                             totalLength:nil];
  if ([self deliverResponse:response toTask:task context:context]) {
    [self finishTask:task key:key context:context error:nil];
  } else {
    [self closeContext:context];
    [self removeContextForKey:key context:context];
  }
}

- (void)finishTask:(id<WKURLSchemeTask>)task
                key:(NSValue *)key
            context:(LNNResourceTaskContext *)context
              error:(nullable NSError *)error {
  [self closeContext:context];
  dispatch_sync(dispatch_get_main_queue(), ^{
    if (![self isCancelled:context]) {
      if (error != nil) {
        [task didFailWithError:error];
      } else {
        [task didFinish];
      }
    }
  });
  [self removeContextForKey:key context:context];
}

- (void)removeContextForKey:(NSValue *)key context:(LNNResourceTaskContext *)context {
  @synchronized(self) {
    if (_contexts[key] == context) {
      [_contexts removeObjectForKey:key];
    }
  }
}

@end
