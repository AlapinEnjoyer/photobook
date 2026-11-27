import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}

export default function About({ children }: Props) {
  return (
    <main className="pb-about" aria-label="About">
      <div className="pb-about-inner">{children}</div>
    </main>
  );
}
