import type { ComponentType } from 'react';
import { snapsStyles } from '../theme/styles';

/**
 * Wraps a component so the compiled Tailwind CSS is injected as a <style> inside
 * the Shadow DOM where the component is mounted. Without this, `shadow: 'open'`
 * isolates the component from the page's stylesheets and it renders unstyled.
 */
export function withShadowStyles<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  return function ShadowStyled(props: P) {
    return (
      <>
        <style>{snapsStyles}</style>
        <Component {...props} />
      </>
    );
  };
}
