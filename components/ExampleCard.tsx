type ExampleCardProps = {
  title: string;
};

export function ExampleCard({ title }: ExampleCardProps) {
  return <article>{title}</article>;
}
