import { useCallback, useRef } from "react";
import { FlatList, type ListRenderItem, Text } from "react-native";
import {
	useFeedbAIReady,
	useFeedbacks,
	useToggleVote,
} from "../hooks/useFeedbAI";
import type { FeedbackItem } from "../types/FeedbAI";
import type { FeedbAIListProps } from "./FeedbAI.types";
import FeedbAIItem from "./FeedbAIItem";
import { useFeedbAITheme } from "./useTheme";

const keyExtractor = (item: FeedbackItem) => item.uid;

export default function FeedbAIList({
	onVote,
	onItemPress,
	emptyLabel = "No ideas here yet — yours could be the first.",
	containerStyle,
	contentStyle,
	itemStyle,
	ListHeaderComponent,
}: FeedbAIListProps) {
	const { styles } = useFeedbAITheme();
	// `useFeedbacks` starts the module if the app never did, and settles the ranking
	// on mount — so this list behaves the same whether or not anything was set up.
	const feedbacks = useFeedbacks();
	const ready = useFeedbAIReady();
	const toggleVote = useToggleVote();

	// Consumers usually pass inline callbacks; keeping them in a ref means the
	// handlers below stay stable and the memoised rows keep their memo.
	const callbacks = useRef({ onVote, onItemPress });
	callbacks.current = { onVote, onItemPress };

	const handleVote = useCallback(
		(item: FeedbackItem) => {
			toggleVote(item.uid);
			callbacks.current.onVote?.(item, !item.liked);
		},
		[toggleVote],
	);

	const handlePress = useCallback(
		(item: FeedbackItem) => callbacks.current.onItemPress?.(item),
		[],
	);

	const renderItem: ListRenderItem<FeedbackItem> = useCallback(
		({ item }) => (
			<FeedbAIItem
				item={item}
				onVote={handleVote}
				onPress={onItemPress ? handlePress : undefined}
				style={itemStyle}
			/>
		),
		[handleVote, handlePress, onItemPress, itemStyle],
	);

	return (
		<FlatList
			data={feedbacks}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			style={[styles.list, containerStyle]}
			contentContainerStyle={[styles.listContent, contentStyle]}
			ListHeaderComponent={ListHeaderComponent}
			// Nothing until storage has been read, so the empty state cannot flash
			// over a board that is about to appear.
			ListEmptyComponent={
				ready ? <Text style={styles.empty}>{emptyLabel}</Text> : null
			}
			showsVerticalScrollIndicator={false}
			initialNumToRender={6}
			windowSize={9}
			keyboardShouldPersistTaps="handled"
			keyboardDismissMode="on-drag"
		/>
	);
}
