/**
 * The app background of the new UI: "Mesh + hạt" since 10/11/2026 (owner, QBG; Figma "Nền app/Mesh hạt" 95:315, 95:321), fixed behind
 * the content. The name stays until M9 so branches in flight that import it keep compiling.
 */
export function DotGridBackground() {
  return <div aria-hidden className="app-mesh pointer-events-none fixed inset-0 -z-10" />;
}
