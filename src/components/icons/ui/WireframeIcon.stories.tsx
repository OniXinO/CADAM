import type { Meta, StoryObj } from '@storybook/react';
import { WireframeIcon } from './WireframeIcon';

const meta = {
  component: WireframeIcon,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
  },
} satisfies Meta<typeof WireframeIcon>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 24,
  },
};
