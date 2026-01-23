import { DocsLayout } from "@/components/docs/DocsLayout";
import { EndpointBlock } from "@/components/docs/EndpointBlock";

export default function ListsApiPage() {
  return (
    <DocsLayout
      title="Lists API"
      description="Manage lead lists and folders."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            Lists are collections of leads. You can create lists manually, from scrape jobs,
            or by filtering existing leads. Lists can be organized into folders.
          </p>
        </div>

        <EndpointBlock
          method="GET"
          path="/api/lists"
          description="Get all lists for the organization"
          auth="session"
          parameters={[
            {
              name: "folderId",
              type: "string",
              required: false,
              description: "Filter by folder ID",
            },
            {
              name: "search",
              type: "string",
              required: false,
              description: "Search lists by name",
            },
          ]}
          responseExample={`{
  "data": [
    {
      "id": "list-123",
      "name": "Q1 Sales Prospects",
      "leadCount": 500,
      "folderId": "folder-1",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "total": 15
}`}
        />

        <EndpointBlock
          method="POST"
          path="/api/lists"
          description="Create a new list"
          auth="session"
          parameters={[
            {
              name: "name",
              type: "string",
              required: true,
              description: "List name",
            },
            {
              name: "folderId",
              type: "string",
              required: false,
              description: "Parent folder ID",
            },
          ]}
          requestExample={`{
  "name": "Engineering Leaders",
  "folderId": "folder-1"
}`}
          responseExample={`{
  "id": "list-456",
  "name": "Engineering Leaders",
  "leadCount": 0,
  "folderId": "folder-1",
  "createdAt": "2024-01-25T09:00:00Z"
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/lists/:id"
          description="Get a specific list with its leads"
          auth="session"
          parameters={[
            {
              name: "id",
              type: "string",
              required: true,
              description: "List ID",
            },
            {
              name: "page",
              type: "number",
              required: false,
              description: "Page number for leads pagination",
            },
            {
              name: "limit",
              type: "number",
              required: false,
              description: "Leads per page (default: 50)",
            },
          ]}
          responseExample={`{
  "id": "list-123",
  "name": "Q1 Sales Prospects",
  "leadCount": 500,
  "leads": [
    {
      "id": "lead-1",
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "title": "VP of Sales",
      "company": "Anthropic",
      "workEmail": "john@anthropic.com"
    }
  ],
  "total": 500,
  "page": 1,
  "totalPages": 10
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/lists/:id/export"
          description="Export list as CSV"
          auth="session"
          parameters={[
            {
              name: "id",
              type: "string",
              required: true,
              description: "List ID",
            },
          ]}
        />

        <EndpointBlock
          method="DELETE"
          path="/api/lists/:id"
          description="Delete a list"
          auth="session"
          parameters={[
            {
              name: "id",
              type: "string",
              required: true,
              description: "List ID",
            },
          ]}
        />

        <div>
          <h2 className="text-xl font-semibold mb-4">Folder Management</h2>
        </div>

        <EndpointBlock
          method="GET"
          path="/api/lists/folders"
          description="Get all folders"
          auth="session"
          responseExample={`{
  "data": [
    {
      "id": "folder-1",
      "name": "Sales",
      "listCount": 5
    }
  ]
}`}
        />

        <EndpointBlock
          method="POST"
          path="/api/lists/folders"
          description="Create a new folder"
          auth="session"
          parameters={[
            {
              name: "name",
              type: "string",
              required: true,
              description: "Folder name",
            },
          ]}
          requestExample={`{
  "name": "Marketing Campaigns"
}`}
        />
      </section>
    </DocsLayout>
  );
}
