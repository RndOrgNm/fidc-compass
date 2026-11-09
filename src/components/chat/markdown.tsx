import type { ComponentPropsWithoutRef } from "react";

import type { Citation } from "@/lib/agui/citations";

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

/** What a source is called where it is offered: its label, or the start of its text. */
export function citationTitle(citation: Citation): string {
  if (citation.label) return citation.label;
  const flat = citation.text.replace(/\s+/g, " ").trim();
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat;
}

/**
 * The chat's Markdown with the numbered sources of an answer drawn as buttons: the `[[n]](#cite-n)`
 * links that `resolveMarkers` wrote open the source n. Any other link is drawn as it is.
 */
export function markdownComponents(citations: Citation[], onOpen: (citation: Citation) => void) {
  return {
    ...MARKDOWN_COMPONENTS,
    a: ({ node, href, children, ...props }: Tag<"a">) => {
      const number = href?.match(/^#cite-(\d+)$/)?.[1];
      const citation = number ? citations.find((c) => c.n === Number(number)) : undefined;
      if (!citation) {
        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      }
      return (
        <button
          type="button"
          aria-label={`Fonte ${citation.n}: ${citationTitle(citation)}`}
          title={citationTitle(citation)}
          onClick={() => onOpen(citation)}
          className="mx-0.5 align-baseline font-semibold underline underline-offset-2 hover:opacity-80"
        >
          {children}
        </button>
      );
    },
  };
}
