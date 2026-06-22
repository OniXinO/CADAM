import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { OrthographicPerspectiveToggle } from './OrthographicPerspectiveToggle';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div style={{ padding: '20px' }}>
    <Story />
  </div>
);

const meta = {
  component: OrthographicPerspectiveToggle,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    isOrthographic: { control: 'boolean' },
  },
} satisfies Meta<typeof OrthographicPerspectiveToggle>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOrthographic: false,
  },
};
