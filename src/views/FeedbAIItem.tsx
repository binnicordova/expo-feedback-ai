import { memo } from "react";
import {
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import { AgentBuildingIcon, CommentIcon, HeartIcon } from "../icons";
import type { FeedbackItem } from "../types/FeedbAI";
import { initialsOf, timeAgo } from "../utils/format";
import { useFeedbAITheme } from "./useTheme";

type Props = {
	item: FeedbackItem;
	onVote: (item: FeedbackItem) => void;
	onPress?: (item: FeedbackItem) => void;
	style?: StyleProp<ViewStyle>;
};

/**
 * One row. Memoised, and `feedbacksAtom` hands back the same object for rows that
 * did not change, so a vote re-renders exactly one row instead of the whole list
 * — which matters here because every row draws three SVGs.
 */
function FeedbAIItem({ item, onVote, onPress, style }: Props) {
	const { theme, styles } = useFeedbAITheme();
	// A draft has no author until the backend attributes it.
	const author = item.author ?? (item.pending ? "You" : "Anonymous");

	return (
		<Pressable
			style={[styles.item, style]}
			onPress={onPress && (() => onPress(item))}
		>
			<Text style={styles.title}>{item.title}</Text>
			{item.description ? (
				<Text style={styles.description}>{item.description}</Text>
			) : null}

			<View style={styles.footer}>
				<View style={styles.avatar}>
					<Text style={styles.avatarLabel}>{initialsOf(author)}</Text>
				</View>
				<View style={styles.author}>
					<Text style={styles.authorName}>{author}</Text>
					<Text style={styles.authorMeta}>
						{item.pending ? "Sent — we’re reading it" : timeAgo(item.createdAt)}
					</Text>
				</View>

				<View style={styles.counters}>
					<AgentBuildingIcon
						building={item.agentBuilding}
						color={theme.iconColor}
						activeColor={theme.primaryColor}
					/>

					<View style={styles.counter}>
						<CommentIcon color={theme.iconColor} />
						<Text style={styles.counterValue}>{item.comments ?? 0}</Text>
					</View>

					<Pressable
						accessibilityRole="button"
						accessibilityState={{ selected: item.liked }}
						accessibilityLabel={`${item.liked ? "Remove vote from" : "Vote for"} ${item.title}`}
						hitSlop={10}
						style={({ pressed }) => [styles.counter, pressed && styles.pressed]}
						onPress={() => onVote(item)}
					>
						<HeartIcon
							filled={item.liked}
							color={item.liked ? theme.primaryColor : theme.iconColor}
						/>
						{item.likes > 0 ? (
							<Text
								style={[
									styles.counterValue,
									item.liked && styles.counterValueActive,
								]}
							>
								{item.likes}
							</Text>
						) : null}
					</Pressable>
				</View>
			</View>
		</Pressable>
	);
}

export default memo(FeedbAIItem);
