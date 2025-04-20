import { Link as RadixLink, LinkProps as RadixLinkProps } from '@radix-ui/themes';

export interface LinkProps extends RadixLinkProps {
  to: string;
  children?: React.ReactNode;
}

export const Link = (props: LinkProps) => {
  const { to, children, ...rest } = props;
  return (
    <RadixLink href="#" {...rest} onClick={() => window.navigate?.(to)}>
      {children}
    </RadixLink>
  );
};
