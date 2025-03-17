import { Link as RadixLink, LinkProps as RadixLinkProps } from '@radix-ui/themes';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router';

export interface LinkProps extends RadixLinkProps {
  to: string;
  children?: React.ReactNode;
  linkProps?: Omit<RouterLinkProps, 'to'>;
}

export const Link = (props: LinkProps) => {
  const { to, children, linkProps, ...rest } = props;
  return (
    <RadixLink href="#" {...rest}>
      <RouterLink to={to} {...linkProps}>
        {children}
      </RouterLink>
    </RadixLink>
  );
};
