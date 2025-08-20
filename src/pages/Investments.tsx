import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, BarChart3, Plus, RefreshCw } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function Investments() {
  const { format } = useCurrency();

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Your Investments – Money Matter</title>
        <meta name="description" content="Track your portfolio and watch your wealth grow" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/investments" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Investments</h1>
              <p className="text-gray-600">Track your portfolio and watch your wealth grow.</p>
            </div>
            <Button className="bg-black hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-2" />
              Log Investment
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-sm text-gray-600">Total Invested</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-sm text-gray-600">Current Value</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-sm text-gray-600">Overall P&L</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{format(0)}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm text-blue-600">Available to Invest</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{format(50500)}</div>
                <div className="text-xs text-blue-500 mt-1">From this month's budget surplus</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Investment Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invested</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No investments logged yet.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}