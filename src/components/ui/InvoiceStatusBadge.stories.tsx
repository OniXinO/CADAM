import type { Meta, StoryObj } from '@storybook/react';
import { InvoiceStatusBadge } from './invoice-status-badge';

const meta = {
  component: InvoiceStatusBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof InvoiceStatusBadge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
