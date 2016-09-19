package util

func Contains(list []string, item string) bool {
	for _, elem := range list {
		if elem == item {
			return true
		}
	}
	return false
}
