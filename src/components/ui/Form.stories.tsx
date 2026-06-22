import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { Form } from './form';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div className="p-6">
    <Story />
  </div>
);

const meta = {
  component: Form,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof Form>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
