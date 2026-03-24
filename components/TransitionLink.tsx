"use client";

import type { ComponentProps, MouseEvent } from "react";
import { startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { shouldAnimateHeaderTransition } from "@/components/headerAnimationRoutes";

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  disableTransition?: boolean;
};

export default function TransitionLink({
  href,
  onClick,
  onMouseEnter,
  onFocus,
  disableTransition = false,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAnimating, navigateImmediately, triggerTransition } = useHeaderTransition();
  const isInternalRoute = href.startsWith("/");

  const prefetchLink = () => {
    if (!isInternalRoute) return;

    try {
      router.prefetch(href);
    } catch {
      // Prefetch failures should not block navigation.
    }
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (
      disableTransition ||
      !isInternalRoute ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const currentPath = pathname ?? window.location.pathname;

    if (!shouldAnimateHeaderTransition(currentPath, href)) {
      return;
    }

    if (isAnimating) {
      event.preventDefault();
      navigateImmediately({
        href,
        navigate: (nextHref) => {
          startTransition(() => {
            router.push(nextHref);
          });
        },
      });
      return;
    }

    event.preventDefault();

    triggerTransition({
      href,
      currentPath,
      navigate: (nextHref) => {
        startTransition(() => {
          router.push(nextHref);
        });
      },
      prefetch: () => prefetchLink(),
    });
  };

  return (
    <Link
      {...props}
      href={href}
      onClick={handleClick}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetchLink();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetchLink();
      }}
    />
  );
}
