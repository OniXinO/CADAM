import type { Meta, StoryObj } from '@storybook/react';
import { AssistantLoading } from './AssistantLoading';

const meta = {
  component: AssistantLoading,
  tags: ['autodocs'],
} satisfies Meta<typeof AssistantLoading>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
