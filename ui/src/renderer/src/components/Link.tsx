import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router';

import { Link as UILink, LinkProps as UILinkProps } from './ui';

export interface LinkProps extends UILinkProps {
  to: string;
  children?: React.ReactNode;
  linkProps?: Omit<RouterLinkProps, 'to'>;
}

export const Link = (props: LinkProps) => {
  const { to, children, linkProps, ...rest } = props;
  return (
    <UILink asChild {...rest}>
      <RouterLink to={to} {...linkProps}>
        {children}
      </RouterLink>
    </UILink>
  );
};
