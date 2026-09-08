import Svg, { Circle, Path } from "react-native-svg";

type IconProps = {
	size?: number;
	/** Required: icons carry no palette of their own — the view passes the theme's. */
	color: string;
};

/** Outline by default, solid once this device has voted. */
export const HeartIcon = ({
	size = 20,
	color,
	filled = false,
}: IconProps & { filled?: boolean }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M12 20.7 4.3 13a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l.9.9.9-.9a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z"
			fill={filled ? color : "none"}
			stroke={color}
			strokeWidth={1.8}
			strokeLinejoin="round"
		/>
	</Svg>
);

export const CommentIcon = ({ size = 20, color }: IconProps) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M8.5 18.5H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7.5a3 3 0 0 1-3 3h-3l-3.2 2.6a.6.6 0 0 1-1-.5v-2.1Z"
			fill="none"
			stroke={color}
			strokeWidth={1.8}
			strokeLinejoin="round"
		/>
	</Svg>
);

/**
 * A dashed ring while a feedback is only queued; a filled sparkle once an AI agent
 * is writing the code for it, bound for the next release.
 */
export const AgentBuildingIcon = ({
	size = 20,
	color,
	activeColor,
	building = false,
}: IconProps & { activeColor: string; building?: boolean }) =>
	building ? (
		<Svg width={size} height={size} viewBox="0 0 24 24">
			<Path
				d="M12 3.5 13.7 9.1 19.3 10.8 13.7 12.5 12 18.1 10.3 12.5 4.7 10.8 10.3 9.1Z"
				fill={activeColor}
			/>
			<Path
				d="m18.2 15.5.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z"
				fill={activeColor}
			/>
		</Svg>
	) : (
		<Svg width={size} height={size} viewBox="0 0 24 24">
			<Circle
				cx={12}
				cy={12}
				r={8}
				fill="none"
				stroke={color}
				strokeWidth={1.8}
				strokeDasharray="3 3"
			/>
		</Svg>
	);

/** Arrow up — the send affordance on the composer's round button. */
export const SendIcon = ({ size = 20, color }: IconProps) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M12 19.5V5M5.5 11.5 12 5l6.5 6.5"
			fill="none"
			stroke={color}
			strokeWidth={2.2}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</Svg>
);

/** Speech bubble with a plus — the invitation to add an idea. */
export const ComposeIcon = ({ size = 22, color }: IconProps) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M20 12.8a3 3 0 0 1-3 3h-3l-3.2 2.6a.6.6 0 0 1-1-.5v-2.1H7a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z"
			fill="none"
			stroke={color}
			strokeWidth={1.9}
			strokeLinejoin="round"
		/>
		<Path
			d="M12 8v4.4M9.8 10.2h4.4"
			stroke={color}
			strokeWidth={1.9}
			strokeLinecap="round"
		/>
	</Svg>
);
