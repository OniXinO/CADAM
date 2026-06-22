import type { Meta, StoryObj } from '@storybook/react';
import { LightingControls } from './LightingControls';

const meta = {
  component: LightingControls,
  tags: ['autodocs'],
  argTypes: {
    brightness: { control: 'number' },
    roughness: { control: 'number' },
    normalIntensity: { control: 'number' },
    polygonCount: { control: 'number' },
  },
} satisfies Meta<typeof LightingControls>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    brightness: 80,
    roughness: 50,
    normalIntensity: 60,
    polygonCount: 250000,
  },
};
