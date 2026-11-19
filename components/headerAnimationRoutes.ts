export const HOME_ROUTE = "/";

export const shouldAnimateHeaderTransition: (currentPath: string, href: string) => boolean = () => false;

export function shouldRenderAnimatedHeader(pathname: string) {
  return pathname === HOME_ROUTE;
}
