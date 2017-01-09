package event

//ErrorDoc is the layout of the server error event
type Event struct {
	ID        string `gorethink:"id" json:"id"`
	Env       string `gorethink:"env" json:"env"`
	Hostname  string `gorethink:"hostname" json:"hostname"`
	Module    string `gorethink:"module" json:"module"`
	Name      string `gorethink:"name" json:"name"`
	Timestamp int    `gorethink:"timestamp" json:"timestamp"`
}
