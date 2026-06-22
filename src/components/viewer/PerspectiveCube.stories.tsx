import type { Meta, StoryObj } from '@storybook/react';
import PerspectiveCube from './PerspectiveCube';

const meta = {
  component: PerspectiveCube,
  tags: ['autodocs'],
} satisfies Meta<typeof PerspectiveCube>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
