const URL_PATTERN = /(https?:\/\/\S+)/g;

interface LinkifiedTextProps {
  text: string;
}

// split avec un groupe capturant : les URL tombent aux indices impairs.
export function LinkifiedText({ text }: LinkifiedTextProps) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: les fragments n'ont pas d'autre identité stable
          <a key={index} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
