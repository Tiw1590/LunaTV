'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { startTransition, type MouseEvent, type ReactNode, useCallback } from 'react';

interface FastLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /**
   * Force a full page refresh instead of SPA navigation.
   * Useful for pages that need to bypass React's rendering pipeline.
   */
  forceRefresh?: boolean;
  /**
   * Use React 18's startTransition to mark navigation as non-blocking.
   * Keeps the UI responsive during navigation.
   */
  useTransitionNav?: boolean;
  /**
   * Additional onClick handler
   */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Accessibility label
   */
  'aria-label'?: string;
  /**
   * Target attribute for opening in new tab
   */
  target?: string;
  /**
   * Rel attribute for security when using target="_blank"
   */
  rel?: string;
}

/**
 * FastLink - 智能混合导航组件（方案 A）
 *
 * 1. 针对 /play、/live 等重型播放器页面，进出自动强制整页刷新（释放内存与清理实例，杜绝假死）
 * 2. 针对普通页面之间，在 Hover / Touch 阶段自动预加载（Prefetch），点击时基于 startTransition 秒开
 */
export function FastLink({
  href,
  children,
  className,
  forceRefresh = false,
  useTransitionNav = true,
  onClick,
  'aria-label': ariaLabel,
  target,
  rel,
}: FastLinkProps) {
  const router = useRouter();
  const pathname = usePathname() || '';

  // 判断是否为重型多媒体页面（进入或切出均强制浏览器原生刷新）
  const isHeavyRoute =
    forceRefresh ||
    pathname.startsWith('/play') ||
    pathname.startsWith('/live') ||
    href.startsWith('/play') ||
    href.startsWith('/live');

  // 鼠标悬停或触摸时智能预加载目标路由
  const handlePrefetch = useCallback(() => {
    if (isHeavyRoute) return;
    if (href.startsWith('http://') || href.startsWith('https://')) return;
    try {
      router.prefetch(href);
    } catch {
      // 忽略预取异常
    }
  }, [href, isHeavyRoute, router]);

  // 处理点击导航事件
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    const isModifiedClick =
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target === '_blank';

    if (isModifiedClick) {
      return;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      return;
    }

    e.preventDefault();

    // 模式 1：进出重型页面或显式指定 forceRefresh 时，走原生浏览器导航，彻底释放上一页内存
    if (isHeavyRoute) {
      window.location.assign(href);
      return;
    }

    // 模式 2：普通页面平滑导航（非阻塞 startTransition）
    if (useTransitionNav) {
      startTransition(() => {
        router.push(href);
      });
      return;
    }

    // 模式 3：标准 Next.js SPA 路由
    router.push(href);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      className={className}
      prefetch={false}
      aria-label={ariaLabel}
      target={target}
      rel={target === '_blank' ? rel || 'noopener noreferrer' : rel}
    >
      {children}
    </Link>
  );
}
