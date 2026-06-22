import type { Meta, StoryObj } from '@storybook/react';
import { ChatReasoning } from './ChatReasoning';

const meta = {
  component: ChatReasoning,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    isStreaming: { control: 'boolean' },
  },
} satisfies Meta<typeof ChatReasoning>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Let me break down the geometry: we need a hollow sphere with an inner diameter of 25mm and wall thickness of 3mm. I'll use a difference operation to subtract an inner sphere from the outer.",
    isStreaming: false,
  },
};
