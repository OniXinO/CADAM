import type { Meta, StoryObj } from '@storybook/react';
import { ViewGizmo } from './ViewGizmo';

const meta = {
  component: ViewGizmo,
  tags: ['autodocs'],
} satisfies Meta<typeof ViewGizmo>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
