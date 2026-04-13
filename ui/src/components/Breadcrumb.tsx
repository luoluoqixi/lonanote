import { Link, LinkProps } from '@radix-ui/themes';
import clsx from 'clsx';
import { ComponentProps, ComponentPropsWithoutRef, Fragment, ReactNode, forwardRef } from 'react';
import { FaChevronRight, FaEllipsisH } from 'react-icons/fa';

const css = `
.breadcrumb {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--gray-11); /* muted text */
}

.breadcrumbList {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
}

.breadcrumbItem {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.breadcrumbLink {
  text-decoration: none;
  color: inherit;
  transition: color 0.2s;
}

.breadcrumbLink:hover {
  color: var(--gray-12); /* hover color */
}

.breadcrumbPage {
  font-weight: normal;
  color: var(--gray-12); /* foreground color */
}

.breadcrumbSeparator {
  display: inline-block;
  width: 12px;
  height: 12px;
}

.breadcrumbEllipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.breadcrumbEllipsis svg {
  width: 14px;
  height: 14px;
}`;

const BreadcrumbRoot = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<'nav'> & {
    separator?: ReactNode;
  }
>(({ className, ...props }, ref) => (
  <>
    <style>{css}</style>
    <nav ref={ref} aria-label="breadcrumb" className={clsx('breadcrumb', className)} {...props} />
  </>
));
BreadcrumbRoot.displayName = 'Breadcrumb';

const BreadcrumbList = forwardRef<HTMLOListElement, ComponentPropsWithoutRef<'ol'>>(
  ({ className, ...props }, ref) => (
    <ol ref={ref} className={clsx('breadcrumbList', className)} {...props} />
  ),
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = forwardRef<HTMLLIElement, ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={clsx('breadcrumbItem', className)} {...props} />
  ),
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = forwardRef<HTMLAnchorElement, LinkProps>(({ className, ...props }, ref) => {
  return <Link ref={ref} className={clsx('breadcrumbLink', className)} {...props} />;
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={clsx('breadcrumbPage', className)}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({ children, className, ...props }: ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={clsx('breadcrumbSeparator', className)}
    {...props}
  >
    {children ?? <FaChevronRight style={{ marginBottom: '2px' }} size="12px" />}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({ className, ...props }: ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={clsx('breadcrumbEllipsis', className)}
    {...props}
  >
    <FaEllipsisH className="h-2 w-2" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export interface BreadcrumbPathItem {
  value: string;
  title?: string;
  href?: string;
}

export interface BreadcrumbLazyProps extends ComponentPropsWithoutRef<'nav'> {
  /** 当前路径 */
  path?: string;
  /** 路径分隔符 @default '/' */
  pathSeparator?: string;
  /** items */
  items?: string[];
  /** 点击某一个 item 时 */
  onItemClick?: (item: BreadcrumbPathItem | string, isLast: boolean) => void;
  // /** 最大显示数量, 默认不限制 */
  // maxShowCount?: number;

  itemProps?: ComponentPropsWithoutRef<'li'>;
  linkProps?: LinkProps;
  pageProps?: ComponentPropsWithoutRef<'span'>;
  separatorProps?: ComponentProps<'li'>;
}

const BreadcrumbLazy = ({
  path,
  pathSeparator,
  items,
  onItemClick,
  itemProps,
  linkProps,
  pageProps,
  separatorProps,
  ...props
}: BreadcrumbLazyProps) => {
  const pathSep = pathSeparator || '/';
  const viewItems = path ? path.split(pathSep) : items;
  const itemsCount = viewItems?.length || 0;
  return (
    <Breadcrumb.Root {...props}>
      <Breadcrumb.List>
        {viewItems?.map((item: string, i: number) => {
          const isLast = i === itemsCount - 1;
          const value = item;
          const onClick = () => {
            const path = viewItems.slice(0, i + 1).join(pathSep);
            onItemClick?.(path, isLast);
          };
          return (
            <Fragment key={i}>
              {
                <Breadcrumb.Item onClick={onClick} {...itemProps}>
                  {isLast ? (
                    <Breadcrumb.Page {...pageProps}>{value}</Breadcrumb.Page>
                  ) : (
                    <Breadcrumb.Link {...linkProps}>{value}</Breadcrumb.Link>
                  )}
                </Breadcrumb.Item>
              }
              {!isLast && <Breadcrumb.Separator {...separatorProps} />}
            </Fragment>
          );
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};

export const Breadcrumb = {
  Lazy: BreadcrumbLazy,
  Root: BreadcrumbRoot,
  List: BreadcrumbList,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
  Ellipsis: BreadcrumbEllipsis,
};
