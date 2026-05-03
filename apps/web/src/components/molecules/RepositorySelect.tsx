import { Select } from '../atoms/Select';

type RepositoryOption = {
  id: string;
  name: string;
};

type RepositorySelectProps = {
  repositories: RepositoryOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export function RepositorySelect({
  repositories,
  value,
  onChange,
  placeholder = 'Select repository...',
  className,
  required,
}: RepositorySelectProps) {
  return (
    <Select
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    >
      <option value="">{placeholder}</option>
      {repositories.map((repository) => (
        <option key={repository.id} value={repository.id}>
          {repository.name}
        </option>
      ))}
    </Select>
  );
}
