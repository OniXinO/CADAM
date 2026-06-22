import type { Meta, StoryObj } from '@storybook/react';
import { StreamingCodeBlock } from './StreamingCodeBlock';

const meta = {
  component: StreamingCodeBlock,
  tags: ['autodocs'],
  argTypes: {
    code: { control: 'text' },
    isStreaming: { control: 'boolean' },
    filename: { control: 'text' },
  },
} satisfies Meta<typeof StreamingCodeBlock>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: `// Parametric vase with spiral pattern
module vase(height = 100, baseRadius = 30) {
  difference() {
    cylinder(h = height, r = baseRadius);
    cylinder(h = height - 3, r = baseRadius - 4);
  }
}

vase(height = 120, baseRadius = 35);`,
    isStreaming: false,
    filename: 'parametric-vase.scad',
  },
};
