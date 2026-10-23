import { useInView } from "../utils/useInView";

/**
 * Fades + slides its content in the first time it scrolls into view. Only opacity and
 * transform animate (GPU-friendly); people who prefer reduced motion get no movement.
 */
const Reveal = ({ as: Tag = "div", delay = 0, className = "", children, ...rest }) => {
  const [ref, inView] = useInView(0.12);
  return (
    <Tag
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
