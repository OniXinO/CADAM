import type { Meta, StoryObj } from '@storybook/react';
import { ConditionalWrapper } from './ConditionalWrapper';

const meta = {
  component: ConditionalWrapper,
  tags: ['autodocs'],
} satisfies Meta<typeof ConditionalWrapper>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
