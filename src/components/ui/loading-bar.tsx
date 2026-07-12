"use client";

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: 'ease',
  speed: 500,
});

function LoadingBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}

export function LoadingBar() {
  return (
    <Suspense fallback={null}>
      <LoadingBarInner />
    </Suspense>
  );
}

// Custom styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    #nprogress {
      pointer-events: none;
    }
    #nprogress .bar {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      position: fixed;
      z-index: 9999;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
    }
    #nprogress .peg {
      display: block;
      position: absolute;
      right: 0px;
      width: 100px;
      height: 100%;
      box-shadow: 0 0 10px #667eea, 0 0 5px #667eea;
      opacity: 1;
      transform: rotate(3deg) translate(0px, -4px);
    }
  `;
  document.head.appendChild(style);
}
