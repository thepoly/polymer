export const HOME_ROUTE = "/";

export function shouldAnimateHeaderTransition(currentPath: string, href: string) {
  return href === HOME_ROUTE && currentPath !== HOME_ROUTE;
}

export function shouldRenderAnimatedHeader(pathname: string) {
  return pathname === HOME_ROUTE;
}
