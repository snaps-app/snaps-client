import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadZone } from '../src/components/shared';
it('rejects unsupported evidence before uploading', () => {
  const changed = vi.fn(); render(<FileUploadZone files={[]} onFilesChange={changed} />);
  fireEvent.change(screen.getByLabelText('Anexar evidências'), { target: { files: [new File(['bad'], 'file.pdf', { type: 'application/pdf' })] } });
  expect(changed).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('PNG');
});
it('revokes a local preview when the evidence is removed', () => {
  const create = vi.fn().mockReturnValue('blob:preview'); const revoke = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
  const v = render(<FileUploadZone files={[new File(['png'], 'file.png', { type: 'image/png' })]} onFilesChange={vi.fn()} />);
  expect(create).toHaveBeenCalledTimes(1); v.unmount(); expect(revoke).toHaveBeenCalledWith('blob:preview');
});
