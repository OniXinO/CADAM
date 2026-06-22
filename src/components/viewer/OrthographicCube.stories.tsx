import type { Meta, StoryObj } from '@storybook/react';
import OrthographicCube from './OrthographicCube';

const meta = {
  component: OrthographicCube,
  tags: ['autodocs'],
} satisfies Meta<typeof OrthographicCube>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
