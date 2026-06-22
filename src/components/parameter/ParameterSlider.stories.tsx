import type { Meta, StoryObj } from '@storybook/react';
import { ParameterSlider } from './ParameterSlider';

const meta = {
  component: ParameterSlider,
  tags: ['autodocs'],
  argTypes: {
    step: { control: 'number' },
  },
} satisfies Meta<typeof ParameterSlider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    step: 0.5,
  },
};
