import { createElement, forwardRef, type ComponentType } from "react";
import { motion as originalMotion, type MotionProps, type TargetAndTransition } from "motion/react";
import { useReducedMotion } from "./motionPreference";

export * from "motion/react";
export { useReducedMotion } from "./motionPreference";

/** Resolve keyframes to their destination, without starting even an infinite loop. */
export function stillTarget(target: MotionProps["animate"]): MotionProps["animate"] {
  if (!target || typeof target !== "object" || Array.isArray(target)) return target;
  return Object.fromEntries(Object.entries(target).map(([key, value]) => [
    key,
    key === "transition" ? { duration: 0, delay: 0, repeat: 0 }
      : Array.isArray(value) ? value.filter((frame) => frame !== null).slice(-1)[0] : value,
  ])) as TargetAndTransition;
}

// Cache wrappers so changing a preference never remounts the game or its inputs.
const components = new Map<string, ComponentType<MotionProps>>();
export const motion = new Proxy(originalMotion, {
  get(target, tag: string) {
    if (tag === "create") return target.create;
    if (!components.has(tag)) {
      const Component = Reflect.get(target, tag);
      const Wrapped = forwardRef<HTMLElement, MotionProps>((props, ref) => {
        const reduce = useReducedMotion();
        return createElement(Component, reduce ? {
          ...props, ref, initial: false,
          animate: stillTarget(props.animate),
          exit: stillTarget(props.exit as MotionProps["animate"]),
          transition: { duration: 0, delay: 0, repeat: 0 },
          whileHover: undefined, whileTap: undefined, layout: false, layoutId: undefined,
        } : { ...props, ref });
      });
      components.set(tag, Wrapped);
    }
    return components.get(tag);
  },
}) as typeof originalMotion;
