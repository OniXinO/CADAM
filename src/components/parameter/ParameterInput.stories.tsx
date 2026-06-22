import type { Meta, StoryObj } from '@storybook/react';
import { ParameterInput } from './ParameterInput';

const meta = {
  component: ParameterInput,
  tags: ['autodocs'],
} satisfies Meta<typeof ParameterInput>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
