import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { OpenSCADViewer } from './OpenSCADViewer';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div style={{ height: '600px', width: '100%' }}>
    <Story />
  </div>
);

const meta = {
  component: OpenSCADViewer,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof OpenSCADViewer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
