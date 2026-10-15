import { FileUp } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { FileTrigger } from 'react-aria-components';
import { Button } from './Button';

type Props = {
  /** The chosen (or rejected) file's name, if any. */
  fileName?: string;
  /** Second line under the name: size, or why the file was refused. */
  detail?: string;
  /** Red state: a refused file. */
  error?: string;
  prompt: string;
  hint: string;
  chooseLabel: string;
  changeLabel: string;
  onSelect: (file: File) => void;
};

/** Click-to-choose or drop one file (Figma `FileDrop`). The CSV check lives in the caller, so a drop and a pick share it. */
export function FileDrop({ fileName, detail, error, prompt, hint, chooseLabel, changeLabel, onSelect }: Props) {
  const [dragging, setDragging] = useState(false);
  const hasFile = fileName !== undefined;

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onSelect(file);
  }

  const tone = error ? 'border-danger bg-danger-soft' : dragging ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface';
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`flex flex-col items-center gap-2 rounded-control border border-dashed px-4 py-8 text-center ${tone}`}
    >
      <FileUp aria-hidden className="size-5 text-muted" />
      {error && <p className="break-words text-ui font-medium text-danger-strong">{error}</p>}
      {hasFile ? (
        <p className="max-w-full wrap-anywhere text-ui font-medium text-ink">{fileName}</p>
      ) : (
        !error && <p className="text-ui font-medium text-ink">{prompt}</p>
      )}
      {detail && <p className="max-w-full break-words text-xs text-muted">{detail}</p>}
      <FileTrigger acceptedFileTypes={['.csv', 'text/csv']} onSelect={(files) => files?.[0] && onSelect(files[0])}>
        <Button variant={hasFile || error ? 'ghost' : 'secondary'}>{hasFile || error ? changeLabel : chooseLabel}</Button>
      </FileTrigger>
      {!hasFile && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
