import * as React from 'react';
import { FeedbAIListProps } from './FeedbAI.types';
import { View, Text, FlatList } from 'react-native';

export default function FeedbAIList(props: FeedbAIListProps) {
  const data = [
    {
      uid: "user-feedback-1",
      title: "QR code scanner on the home page",
      description: "Add a QR code scanner to the home page for quick access to scanning functionality.",
      likes: 10,
    }
  ]
  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <View style={props.itemStyle}>
          <Text>{item.title}</Text>
          <Text>{item.description}</Text>
          <Text>{item.likes} likes</Text>
        </View>
      )}
      keyExtractor={(item) => item.uid}
    />
  );
}