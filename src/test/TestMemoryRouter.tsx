import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

export default function TestMemoryRouter({ future, ...props }: MemoryRouterProps) {
  return (
    <MemoryRouter
      {...props}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
        ...future,
      }}
    />
  );
}
