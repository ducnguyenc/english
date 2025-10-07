package main

import "fmt"

type ListNode struct {
	Val  int
	Next *ListNode
}

/**
 * Definition for singly-linked list.
 * type ListNode struct {
 *     Val int
 *     Next *ListNode
 * }
 */
func reverseKGroup(head *ListNode, k int) *ListNode {
	current := head
	i := 0
	for current.Next != nil && i < k {
		current = current.Next
		i++
	}

	if i < k {
		return head
	}

	var reverse *ListNode = nil
	current = head
	for i := 0; i < k; i++ {
		nodeTemp := current.Next
		current.Next = reverse
		reverse = current
		current = nodeTemp
	}

	head.Next = reverseKGroup(current, k)

	return reverse
}

func main() {
	head := &ListNode{Val: 1, Next: &ListNode{Val: 2, Next: &ListNode{Val: 3, Next: &ListNode{Val: 4, Next: &ListNode{Val: 5}}}}}
	k := 2

	reverseKGroup := reverseKGroup(head, k)

	for reverseKGroup != nil {
		fmt.Println("a ", reverseKGroup.Val)
		reverseKGroup = reverseKGroup.Next
	}
}
