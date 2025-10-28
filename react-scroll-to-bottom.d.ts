declare module 'react-scroll-to-bottom' {
  import { ComponentType, CSSProperties, ReactNode } from 'react';

  interface ScrollToBottomProps {
    children?: ReactNode;
    className?: string;
    followButtonClassName?: string;
    scrollViewClassName?: string;
    style?: CSSProperties;
    mode?: 'top' | 'bottom';
  }

  const ScrollToBottom: ComponentType<ScrollToBottomProps>;
  export default ScrollToBottom;
}

