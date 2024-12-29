import { Link as UILink, LinkProps as UILinkProps } from './ui';

export interface LinkProps extends UILinkProps {
  to: string;
  children?: React.ReactNode;
}

export const Link = (props: LinkProps) => {
  const { to, children, ...rest } = props;
  return (
    <UILink asChild {...rest}>
      <div>{children}</div>
    </UILink>
  );
};
