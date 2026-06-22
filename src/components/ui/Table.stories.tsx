import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './table';

const meta = {
  component: Table,
  tags: ['autodocs'],
} satisfies Meta<typeof Table>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
