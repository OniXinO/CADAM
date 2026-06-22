import type { Meta, StoryObj } from '@storybook/react';
import { Accordion } from './accordion';

const meta = {
  component: Accordion,
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
