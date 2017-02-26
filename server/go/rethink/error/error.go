package error

//ErrorDoc is the layout of the server error event
type ErrorDoc struct {
	ID        string `gorethink:"id" json:"id"`
	Env       string `gorethink:"env" json:"env"`
	Hostname  string `gorethink:"hostname" json:"hostname"`
	Message   string `gorethink:"message" json:"message"`
	Module    string `gorethink:"module" json:"module"`
	Name      string `gorethink:"name" json:"name"`
	Stack     string `gorethink:"stack" json:"stack"`
	Timestamp int    `gorethink:"timestamp" json:"timestamp"`
}
