export const HOME_ROUTE = "/";

export function shouldAnimateHeaderTransition(_currentPath: string, _href: string) {
  return false;
}

export function shouldRenderAnimatedHeader(pathname: string) {
  return pathname === HOME_ROUTE;
}
