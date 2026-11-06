import type { ComponentPropsWithoutRef } from "react";

/** The props react-markdown hands a component: the element's own, and the node it came from. */
type Tag<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & { node?: unknown };

/** How the chat draws the Markdown of an answer: the page of the chat and the side panel share it. */
export const MARKDOWN_COMPONENTS = {
  h2: ({ node, ...props }: Tag<"h2">) => <h2 className="text-xl font-semibold mt-6 mb-3" {...props} />,
  h3: ({ node, ...props }: Tag<"h3">) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
  p: ({ node, ...props }: Tag<"p">) => <p className="mb-3" {...props} />,
  ul: ({ node, ...props }: Tag<"ul">) => (
    <ul className="list-disc list-outside mb-3 space-y-1 ml-6 [&_ul]:ml-6 [&_ul_ul]:ml-6" {...props} />
  ),
  ol: ({ node, ...props }: Tag<"ol">) => (
    <ol className="list-decimal list-outside mb-3 space-y-1 ml-6 [&_ol]:ml-6 [&_ol_ol]:ml-6" {...props} />
  ),
  li: ({ node, ...props }: Tag<"li">) => <li className="leading-relaxed pl-2" {...props} />,
  strong: ({ node, ...props }: Tag<"strong">) => <strong className="font-semibold" {...props} />,
  table: ({ node, ...props }: Tag<"table">) => (
    <table className="border-collapse border border-gray-300 my-4" {...props} />
  ),
  th: ({ node, ...props }: Tag<"th">) => (
    <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />
  ),
  td: ({ node, ...props }: Tag<"td">) => <td className="border border-gray-300 px-4 py-2" {...props} />,
};
