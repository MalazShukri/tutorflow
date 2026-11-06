/** Colors come from CSS variables (src/index.css) so light and dark themes share one set of class names. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"IBM Plex Sans Arabic"', "system-ui", "sans-serif"] },
      colors: {
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), foreground: v("primary-foreground") },
        sage: { DEFAULT: v("sage"), light: v("sage-light"), hover: v("sage-hover") },
        background: v("background"),
        card: v("card"),
        accent: { DEFAULT: v("accent"), hover: v("accent-hover"), soft: v("accent-soft"), faint: v("accent-faint"), deep: v("accent-deep") },
        mist: { DEFAULT: v("mist"), ring: v("mist-ring"), light: v("mist-light"), deep: v("mist-deep") },
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        edge: v("edge"),
        danger: { DEFAULT: v("danger"), hover: v("danger-hover"), soft: v("danger-soft") },
        sidebar: { from: v("sidebar-from"), to: v("sidebar-to") },
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.05), 0 4px 16px -6px rgb(var(--shadow) / 0.10)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.06), 0 12px 28px -10px rgb(var(--shadow) / 0.20)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "zoom-in": { from: { opacity: "0", transform: "translate(-50%,-48%) scale(.97)" }, to: { opacity: "1", transform: "translate(-50%,-50%) scale(1)" } },
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in .15s ease-out",
        "zoom-in": "zoom-in .18s ease-out",
        "slide-in": "slide-in .22s ease-out",
      },
    },
  },
  plugins: [],
};
