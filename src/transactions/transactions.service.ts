import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  Types,
} from 'mongoose';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  AvailedService,
  Transaction,
  TransactionDocument,
} from './schemas/transaction.schema';
import { Service } from '../services/schemas/service.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { ErrorResponse } from '../common/dto/error-response.dto';
import {
  AvailedServiceStatus,
  ServiceCharge,
  StatisticsFilter,
  TransactionStatus,
  VehicleType,
} from '../common/enum';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { throwInternalServerError } from '../common/utils/error-utils';
import { UpdateAvailedServiceDto } from './dto/update-availed-service.dto';
import { CreateAvailedServiceDto } from './dto/create-availed-service.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { GetTransactionDto } from './dto/get-transaction.dto';
import { GetCompletedTransactionDto } from './dto/get-completed-transaction.dto';
import { GetTransactionDetailsDto } from './dto/get-transaction-details.dto';
import { GetWeekSalesDto } from './dto/get-week-sales.dto';
import { getDateRange } from '../common/utils/date-utils';
import { GetTransactionStatisticsDto } from './dto/get-transaction-statistics.dto';
import { Expense } from '../expenses/schema/expense.schema';

type AvailedServiceWithId = AvailedService & {
  _id: Types.ObjectId;
};

type TransactionWithId = Transaction & {
  _id: Types.ObjectId;
  availed_services: AvailedServiceWithId[];
};

type CustomerWithId = Pick<Customer, 'first_name' | 'last_name'> & {
  _id: Types.ObjectId;
};

type ServiceWithId = Pick<Service, 'title' | 'image'> & {
  _id: Types.ObjectId;
};

type AvailedServiceWithPopulatedService = AvailedServiceWithId & {
  service_id: ServiceWithId;
};

type Statistics = {
  gross_income: number;
  company_earnings: number;
  employee_share: number;
  deduction: number;
  discount: number;
};

export type TransactionAvailedService = {
  transaction_id: string;
  transaction_availed_service_id: string;
  service_name: string;
  price: number;
  date: Date;
};

type ExtendedStatistics = Statistics & {
  _id: { date?: string; period?: string };
};

const formatWeek = (date: Date) => {
  const temp = new Date(date);
  const dayOfWeek = temp.getUTCDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const diffToSunday = dayOfWeek === 0 ? 0 : -dayOfWeek; // Move back to Sunday
  temp.setUTCDate(temp.getUTCDate() + diffToSunday);
  return temp.toISOString().split('T')[0]; // yyyy-MM-dd format
};

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<Service>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<Expense>,
  ) {}

  async getTransactions(getTransactionDto: GetTransactionDto) {
    try {
      const { order_by, limit, offset, date_range, status } = getTransactionDto;
      const query = this.transactionModel.find();
      const totalCountQuery = this.transactionModel.find();

      if (date_range) {
        const { start, end } = date_range;
        query.where('check_out').gte(start as unknown as number);
        query.where('check_out').lte(end as unknown as number);

        totalCountQuery.where('check_out').gte(start as unknown as number);
        totalCountQuery.where('check_out').lte(end as unknown as number);
      }

      if (status) {
        query.where('status').equals(status);
        totalCountQuery.where('status').equals(status);
      }

      if (order_by) {
        const { field, direction } = order_by;
        query.sort({ [field]: direction });
      }

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      const totalCount = await totalCountQuery.countDocuments();

      const data = await query
        .populate<{
          customer_id: CustomerWithId;
        }>('customer_id', 'first_name last_name')
        .lean()
        .exec();

      const transactions = data.map((item) => ({
        _id: item._id,
        model: item.model,
        plate_number: item.plate_number,
        check_in: item.check_in,
        check_out: item.check_out,
        customer_id: item.customer_id?._id ?? null,
        first_name: item.customer_id?.first_name ?? 'EmJay',
        last_name: item.customer_id?.last_name ?? 'Customer',
        status: item.status,
      }));

      return new SuccessResponse({ transactions, totalCount });
    } catch {
      throwInternalServerError();
    }
  }

  async getWeekSales(getWeekSalesDto: GetWeekSalesDto) {
    try {
      const { start, end } = getWeekSalesDto.date_range;

      const transactions = await this.transactionModel
        .find({
          status: TransactionStatus.COMPLETED,
          check_out: { $gte: start, $lte: end },
          availed_services: {
            $elemMatch: {
              status: AvailedServiceStatus.DONE,
            },
          },
        })
        .populate<{ availed_services: AvailedServiceWithPopulatedService[] }>({
          path: 'availed_services.service_id',
          select: 'title',
        })
        .sort({ check_out: 'asc' });

      const result: ExtendedStatistics[] =
        await this.transactionModel.aggregate([
          {
            $match: {
              status: TransactionStatus.COMPLETED,
              check_out: { $gte: start, $lte: end },
            },
          },
          { $unwind: '$availed_services' },
          { $match: { 'availed_services.status': AvailedServiceStatus.DONE } },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: '%Y-%m-%d', date: '$check_out' },
                },
              },
              gross_income: { $sum: '$availed_services.price' },
              company_earnings: { $sum: '$availed_services.company_earnings' },
              employee_share: { $sum: '$availed_services.employee_share' },
              deduction: { $sum: '$availed_services.deduction' },
              discount: { $sum: '$availed_services.discount' },
            },
          },
          {
            $sort: { '_id.date': 1 },
          },
        ]);

      const fullDateList = getDateRange(start, end);

      const finalResult = fullDateList.map((date) => {
        const data = result.find((entry) => entry._id.date === date);
        return {
          date,
          gross_income: data ? data.gross_income : 0,
          company_earnings: data ? data.company_earnings : 0,
          employee_share: data ? data.employee_share : 0,
          deduction: data ? data.deduction : 0,
          discount: data ? data.discount : 0,
        };
      });

      const formattedTransaction: TransactionAvailedService[] = [];

      transactions.forEach((transaction) => {
        transaction.availed_services.forEach((service) => {
          const { title } = service.service_id;

          formattedTransaction.push({
            transaction_id: transaction._id.toString(),
            transaction_availed_service_id: service._id.toString(),
            service_name: title,
            price: service.price,
            date: transaction.check_out!,
          });
        });
      });

      return new SuccessResponse({
        results: finalResult,
        transactions: formattedTransaction,
      });
    } catch {
      throwInternalServerError();
    }
  }

  async getTransactionStatistics(
    getTransactionStatisticsDto: GetTransactionStatisticsDto,
  ) {
    try {
      const { filter } = getTransactionStatisticsDto;
      let start: Date;
      const end = new Date(getTransactionStatisticsDto.end);
      if (filter === StatisticsFilter.DAILY) {
        start = new Date(end);
        start.setDate(end.getDate() - 14); // Last 14 days
      } else if (filter === StatisticsFilter.WEEKLY) {
        start = new Date(end);
        const dayOfWeek = start.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
        start.setUTCDate(start.getUTCDate() + diffToMonday - 28);
      } else if (filter === StatisticsFilter.MONTHLY) {
        start = new Date(end);
        start.setMonth(end.getMonth() - 6); // Last 6 months
      } else if (filter === StatisticsFilter.YEARLY) {
        start = new Date(end);
        start.setFullYear(end.getFullYear() - 4); // Last 4 years
      } else {
        start = new Date(end);
        start.setDate(end.getDate() - 28); // Default: Last 4 weeks
      }

      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);

      // MongoDB Date Formats
      const formatMap = {
        daily: '%Y-%m-%d',
        weekly: '%Y-%m-%d',
        monthly: '%Y-%m',
        yearly: '%Y',
      };

      // Function to generate all expected periods
      const generatePeriods = (start: Date, end: Date, type: string) => {
        const periods: string[] = [];
        const tempDate = new Date(start);

        while (tempDate <= end) {
          let formattedPeriod: string = '';
          if (type === 'daily') {
            formattedPeriod = tempDate.toISOString().split('T')[0]; // YYYY-MM-DD
            tempDate.setDate(tempDate.getDate() + 1);
          } else if (type === 'weekly') {
            formattedPeriod = formatWeek(tempDate);
            tempDate.setDate(tempDate.getDate() + 7);
          } else if (type === 'monthly') {
            formattedPeriod = `${tempDate.getUTCFullYear()}-${String(tempDate.getUTCMonth() + 1).padStart(2, '0')}`;
            tempDate.setMonth(tempDate.getMonth() + 1);
          } else if (type === 'yearly') {
            formattedPeriod = `${tempDate.getUTCFullYear()}`;
            tempDate.setFullYear(tempDate.getFullYear() + 1);
          }
          periods.push(formattedPeriod);
        }

        return periods;
      };

      // Get all expected periods
      const expectedPeriods = generatePeriods(start, end, filter);

      // Aggregation Query
      const transactionsAggregation: ExtendedStatistics[] =
        await this.transactionModel.aggregate([
          {
            $match: {
              status: TransactionStatus.COMPLETED,
              check_out: { $gte: start, $lte: end },
              'availed_services.status': AvailedServiceStatus.DONE,
            },
          },
          { $unwind: '$availed_services' },
          {
            $group: {
              _id: {
                period:
                  filter === StatisticsFilter.WEEKLY
                    ? {
                        $dateToString: {
                          format: formatMap[filter],
                          date: {
                            $dateTrunc: {
                              date: {
                                $dateSubtract: {
                                  startDate: '$check_out',
                                  unit: 'day',
                                  amount: 1,
                                },
                              },
                              unit: 'week',
                              timezone: 'UTC',
                            },
                          },
                        },
                      }
                    : {
                        $dateToString: {
                          format: formatMap[filter],
                          date: '$check_out',
                        },
                      },
              },
              gross_income: { $sum: '$availed_services.price' },
              company_earnings: { $sum: '$availed_services.company_earnings' },
              employee_share: { $sum: '$availed_services.employee_share' },
              deduction: { $sum: '$availed_services.deduction' },
              discount: { $sum: '$availed_services.discount' },
            },
          },
          { $sort: { '_id.period': 1 } },
        ]);

      const expensesAggregation: ExtendedStatistics[] =
        await this.expenseModel.aggregate([
          {
            $match: {
              date: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                period:
                  filter === StatisticsFilter.WEEKLY
                    ? {
                        $dateToString: {
                          format: formatMap[filter],
                          date: {
                            $dateTrunc: {
                              date: {
                                $dateSubtract: {
                                  startDate: '$date',
                                  unit: 'day',
                                  amount: 1,
                                },
                              },
                              unit: 'week',
                              timezone: 'UTC',
                            },
                          },
                        },
                      }
                    : {
                        $dateToString: {
                          format: formatMap[filter],
                          date: '$date',
                        },
                      },
              },
              amount: { $sum: '$amount' },
            },
          },
          { $sort: { '_id.period': 1 } },
        ]);

      // Convert aggregation result into a map without _id
      const transactionMap = new Map(
        transactionsAggregation.map(({ _id, ...item }) => [
          _id.period,
          { ...item, period: _id.period },
        ]),
      );

      // Ensure all expected periods exist in the result
      const finalTransactionResult = expectedPeriods.map(
        (period) =>
          transactionMap.get(period) || {
            period,
            gross_income: 0,
            company_earnings: 0,
            employee_share: 0,
            deduction: 0,
            discount: 0,
          },
      );

      // Convert aggregation result into a map without _id
      const expensesMap = new Map(
        expensesAggregation.map(({ _id, ...item }) => [
          _id.period,
          { ...item, period: _id.period },
        ]),
      );

      // Ensure all expected periods exist in the result
      const finalExpensesResult = expectedPeriods.map(
        (period) =>
          expensesMap.get(period) || {
            period,
            amount: 0,
          },
      );

      // Get previous 14 days transaction base on current date
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);

      const transactions = await this.transactionModel
        .find({
          status: TransactionStatus.COMPLETED,
          check_out: { $gte: startDate, $lte: endDate },
          availed_services: {
            $elemMatch: {
              status: AvailedServiceStatus.DONE,
            },
          },
        })
        .populate<{ availed_services: AvailedServiceWithPopulatedService[] }>({
          path: 'availed_services.service_id',
          select: 'title',
        })
        .sort({ check_out: 'asc' });

      const formattedTransaction: TransactionAvailedService[] = [];

      transactions.forEach((transaction) => {
        transaction.availed_services.forEach((service) => {
          const { title } = service.service_id;

          formattedTransaction.push({
            transaction_id: transaction._id.toString(),
            transaction_availed_service_id: service._id.toString(),
            service_name: title,
            price: service.price,
            date: transaction.check_out!,
          });
        });
      });

      return new SuccessResponse({
        income: finalTransactionResult,
        expenses: finalExpensesResult,
        transactions: formattedTransaction,
      });
    } catch {
      throwInternalServerError();
    }
  }

  async getCompletedTransactions(
    getCompletedTransactionDto: GetCompletedTransactionDto,
  ) {
    try {
      const { date_range, assigned_employees, customer_id } =
        getCompletedTransactionDto;
      const { start, end } = date_range;

      const formattedTransaction: TransactionAvailedService[] = [];

      const pipeline: PipelineStage[] = [
        {
          $match: {
            status: TransactionStatus.COMPLETED,
            check_out: { $gte: start, $lte: end },
          },
        },
        { $unwind: '$availed_services' },
        { $match: { 'availed_services.status': AvailedServiceStatus.DONE } },
      ];

      const filter: FilterQuery<TransactionDocument> = {
        status: TransactionStatus.COMPLETED,
        check_out: { $gte: start, $lte: end },
      };

      let projection: ProjectionType<TransactionDocument> = {};

      if (assigned_employees) {
        const ids = assigned_employees.map((item) => new Types.ObjectId(item));

        filter['availed_services.assigned_employee_id'] = {
          $all: ids,
          $size: ids.length,
        };

        projection = {
          availed_services: {
            $filter: {
              input: '$availed_services',
              as: 'service',
              cond: {
                $and: [
                  { $eq: ['$$service.status', AvailedServiceStatus.DONE] },
                  {
                    $eq: [
                      { $size: '$$service.assigned_employee_id' },
                      ids.length,
                    ],
                  },
                  {
                    $setEquals: ['$$service.assigned_employee_id', ids],
                  },
                ],
              },
            },
          },
        };

        pipeline.push({
          $match: {
            'availed_services.assigned_employee_id': {
              $all: ids,
              $size: ids.length,
            },
          },
        });
      }

      if (customer_id) {
        filter['customer_id'] = {
          $eq: new Types.ObjectId(customer_id),
        };
      }

      const transactions = await this.transactionModel
        .find(filter, projection)
        .sort({ check_out: 'asc' })
        .populate<{ availed_services: AvailedServiceWithPopulatedService[] }>({
          path: 'availed_services.service_id',
          select: 'title',
        });

      transactions.forEach((transaction) => {
        transaction.availed_services
          .filter((service) => service.status === AvailedServiceStatus.DONE)
          .forEach((service) => {
            formattedTransaction.push({
              transaction_id: transaction._id.toString(),
              transaction_availed_service_id: service._id.toString(),
              service_name: service.service_id.title,
              price: service.price,
              date: service.end_date!,
            });
          });
      });

      pipeline.push({
        $group: {
          _id: null,
          gross_income: { $sum: '$availed_services.price' },
          company_earnings: { $sum: '$availed_services.company_earnings' },
          employee_share: { $sum: '$availed_services.employee_share' },
          deduction: { $sum: '$availed_services.deduction' },
          discount: { $sum: '$availed_services.discount' },
        },
      });

      const result: Statistics[] =
        await this.transactionModel.aggregate(pipeline);

      const summary =
        result.length > 0
          ? {
              ...result[0],
            }
          : {
              gross_income: 0,
              company_earnings: 0,
              employee_share: 0,
              deduction: 0,
              discount: 0,
            };

      return new SuccessResponse({
        summary,
        transactions: formattedTransaction,
      });
    } catch {
      throwInternalServerError();
    }
  }

  async getTransactionDetails(
    getTransactionDetailsDto: GetTransactionDetailsDto,
  ) {
    const { transaction_id, availed_service_id } = getTransactionDetailsDto;
    const transaction = await this.transactionModel
      .findOne({
        _id: transaction_id,
      })
      .populate<{ customer_id: CustomerWithId }>({
        path: 'customer_id',
        select: 'first_name last_name',
      })
      .populate<{ availed_services: AvailedServiceWithPopulatedService[] }>({
        path: 'availed_services.service_id',
        select: 'title',
      })
      .populate({
        path: 'availed_services.assigned_employee_id',
        model: 'Employee',
        select: 'first_name last_name gender',
      })
      .lean()
      .exec();

    if (!transaction)
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'transaction_id', message: 'Transaction does not exist' },
        ]),
      );

    const service = transaction.availed_services.find(
      (service) => service._id.toString() == availed_service_id?.toString(),
    );

    if (!service)
      throw new NotFoundException(
        new ErrorResponse(404, [
          {
            field: 'availed_service_id',
            message: 'Transaction availed service does not exist',
          },
        ]),
      );

    return new SuccessResponse({
      transaction: {
        _id: transaction_id,
        availed_service_id: availed_service_id,
        first_name: transaction.customer_id?.first_name ?? 'EmJay',
        last_name: transaction.customer_id?.last_name ?? 'Customer',
        vehicle_type: transaction.vehicle_type,
        model: transaction.model,
        vehicle_size: transaction.vehicle_size,
        plate_number: transaction.plate_number,
        title: service.service_id?.title,
        price: service.price,
        deduction: service.deduction,
        discount: service.discount,
        company_earnings: service.company_earnings,
        employee_share: service.employee_share,
        start_date: service.start_date,
        end_date: service.end_date,
        assigned_employees: service.assigned_employee_id,
      },
    });
  }

  async create(createTransactionDto: CreateTransactionDto) {
    if (createTransactionDto.customer_id) {
      const customer = await this.customerModel.findById(
        createTransactionDto.customer_id,
      );
      if (!customer) {
        throw new NotFoundException(
          new ErrorResponse(404, [
            { field: 'customer_id', message: 'Customer does not exist' },
          ]),
        );
      }
    }

    const service = await this.serviceModel.findById(
      createTransactionDto.service_id,
    );

    if (!service)
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'service_id', message: 'Service does not exist' },
        ]),
      );

    const {
      customer_id,
      vehicle_type,
      vehicle_size,
      model,
      plate_number,
      contact_number,
      service_id,
      service_charge,
    } = createTransactionDto;
    const employeeShare = createTransactionDto.price * 0.4;

    try {
      const savedTransaction = this.transactionModel.create({
        customer_id: customer_id ? new Types.ObjectId(customer_id) : null,
        vehicle_type,
        vehicle_size,
        model,
        plate_number,
        contact_number: contact_number ?? null,
        status: TransactionStatus.ONGOING,
        check_in: new Date(),
        check_out: null,
        availed_services: [
          {
            _id: new Types.ObjectId(),
            service_id: new Types.ObjectId(service_id),
            price: createTransactionDto.price,
            discount:
              service_charge === ServiceCharge.FREE
                ? createTransactionDto.price
                : 0,
            deduction: 0,
            company_earnings:
              service_charge === ServiceCharge.FREE
                ? 0
                : createTransactionDto.price - employeeShare,
            employee_share: employeeShare,
            assigned_employee_id: [],
            start_date: null,
            end_date: null,
            status: AvailedServiceStatus.PENDING,
            is_free: service_charge === ServiceCharge.FREE,
            is_paid: service_charge === ServiceCharge.FREE,
          },
        ],
      });

      return new SuccessResponse({
        transaction: { _id: (await savedTransaction)._id },
      });
    } catch {
      throwInternalServerError();
    }
  }

  async getTransaction(transaction_id: ObjectIdDto['transaction_id']) {
    const transaction = await this.transactionModel
      .findById(transaction_id)
      .populate<{
        availed_services: AvailedServiceWithPopulatedService[];
      }>({
        path: 'availed_services.service_id',
        select: 'title image',
      })
      .lean()
      .exec();

    if (!transaction)
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'transaction_id', message: 'Transaction does not exist' },
        ]),
      );

    const availed_services = transaction?.availed_services.map((service) => ({
      _id: service._id,
      service_id: service.service_id._id,
      title: service.service_id.title,
      image: service.service_id.image,
      price: service.price,
      status: service.status,
      is_free: service.is_free,
      is_paid: service.is_paid,
      discount: service.discount,
    }));

    return new SuccessResponse({
      transaction: {
        _id: transaction_id,
        contact_number: transaction.contact_number,
        vehicle_type: transaction.vehicle_type,
        vehicle_size: transaction.vehicle_size,
        model: transaction.model,
        plate_number: transaction.plate_number,
        availed_services,
      },
    });
  }

  async update(
    transaction_id: ObjectIdDto['transaction_id'],
    updateTransactionDto: UpdateTransactionDto,
  ) {
    if (updateTransactionDto.status === TransactionStatus.CANCELLED) {
      const transaction = await this.transactionModel.findByIdAndUpdate(
        transaction_id,
        {
          $set: {
            'availed_services.$[].deduction': 0,
            'availed_services.$[].discount': 0,
            'availed_services.$[].company_earnings': 0,
            'availed_services.$[].employee_share': 0,
            'availed_services.$[].assigned_employee_id': [],
            'availed_services.$[].start_date': null,
            'availed_services.$[].end_date': null,
            'availed_services.$[].is_free': false,
            'availed_services.$[].is_paid': false,
            'availed_services.$[].status': AvailedServiceStatus.CANCELLED,
            status: AvailedServiceStatus.CANCELLED,
            check_out: new Date(),
          },
        },
        { new: true },
      );

      if (transaction) {
        return new SuccessResponse({ transaction: { _id: transaction._id } });
      } else {
        throw new NotFoundException(
          new ErrorResponse(404, [
            { field: 'transaction_id', message: 'Transaction does not exist' },
          ]),
        );
      }
    } else if (updateTransactionDto.status === TransactionStatus.COMPLETED) {
      const transaction = await this.transactionModel.findById(transaction_id);

      if (transaction) {
        if (transaction.status === TransactionStatus.ONGOING) {
          // check if all availed services is cancelled
          const allServicesCancelled = await this.transactionModel.exists({
            _id: transaction_id,
            availed_services: {
              $not: {
                $elemMatch: { status: { $ne: AvailedServiceStatus.CANCELLED } },
              },
            },
          });
          if (allServicesCancelled)
            throw new BadRequestException(
              new ErrorResponse(400, [
                {
                  field: 'status',
                  message:
                    'Transaction cannot be completed if all services is cancelled',
                },
              ]),
            );

          // check if availed service still have pending or ongoing status
          const pendingServiceExist = await this.transactionModel.exists({
            _id: transaction_id,
            'availed_services.status': {
              $in: [AvailedServiceStatus.PENDING, AvailedServiceStatus.ONGOING],
            },
          });
          if (pendingServiceExist)
            throw new BadRequestException(
              new ErrorResponse(400, [
                {
                  field: 'status',
                  message:
                    'Transaction cannot be completed if still have pending or ongoing services',
                },
              ]),
            );

          // check if availed services have assigned employees
          const allDoneEmptyEmployees = await this.transactionModel.exists({
            _id: transaction_id,
            availed_services: {
              $elemMatch: {
                status: AvailedServiceStatus.DONE,
                assigned_employee_id: { $size: 0 },
              },
            },
          });
          if (allDoneEmptyEmployees)
            throw new BadRequestException(
              new ErrorResponse(400, [
                {
                  field: 'assigned_employees_id',
                  message:
                    'Transaction cannot be completed if services has no assigned employees',
                },
              ]),
            );

          if (transaction.customer_id) {
            const customer = await this.customerModel.findById(
              transaction.customer_id,
            );
            const doneTransaction = await this.transactionModel.findOne(
              { _id: transaction_id },
              {
                availed_services: {
                  $elemMatch: { status: AvailedServiceStatus.DONE },
                },
              },
            );

            if (doneTransaction) {
              const services = await Promise.all(
                doneTransaction.availed_services.map(async (availedService) => {
                  const service = await this.serviceModel.findById(
                    availedService.service_id,
                  );

                  if (!service)
                    throw new InternalServerErrorException(
                      new ErrorResponse(500, [
                        {
                          field: 'service_id',
                          message: 'Service does not exist',
                        },
                      ]),
                    );

                  const price = service.price_list.find(
                    (item) =>
                      String(item.size) === String(transaction.vehicle_size),
                  );

                  return {
                    id: service._id,
                    service: service.title,
                    points: price?.points ?? 0,
                    earning_points: price?.earning_points ?? 0,
                    is_free: availedService.is_free,
                  };
                }),
              );

              const sortedServices = services
                .filter(
                  (service): service is NonNullable<typeof service> =>
                    service !== null,
                )
                .sort((a, b) => (a.is_free ? 1 : 0) - (b.is_free ? 1 : 0));

              let customerPoints = customer?.points ?? 0;
              let customerWashCount =
                transaction.vehicle_type === VehicleType.CAR
                  ? (customer?.car_wash_service_count.find(
                      (item) =>
                        String(item.size) === String(transaction.vehicle_size),
                    )?.count ?? 0)
                  : (customer?.moto_wash_service_count.find(
                      (item) =>
                        String(item.size) === String(transaction.vehicle_size),
                    )?.count ?? 0);

              // Update customer points
              sortedServices.forEach((service) => {
                customerPoints = Math.max(
                  0,
                  customerPoints +
                    (service.is_free
                      ? -service.points
                      : service.earning_points),
                );
              });

              // Update wash count logic (Prevent negative wash count)
              sortedServices.forEach((service) => {
                const isCar = transaction.vehicle_type === VehicleType.CAR;
                if (isCar && service.service === 'Car Wash') {
                  customerWashCount = Math.max(
                    0,
                    customerWashCount + (service.is_free ? -10 : 1),
                  );
                } else if (
                  !isCar &&
                  ['Moto Wash', 'Hand Wax', 'Buff Wax'].includes(
                    service.service,
                  )
                ) {
                  customerWashCount = Math.max(
                    0,
                    customerWashCount +
                      (service.is_free && service.service === 'Moto Wash'
                        ? -10
                        : 1),
                  );
                }
              });

              // Update customer wash count object
              const updateWashCount = (
                wash_count: { size: string; count: number }[],
              ) =>
                wash_count.map((item) =>
                  String(item.size) === String(transaction.vehicle_size)
                    ? { size: item.size, count: customerWashCount }
                    : item,
                );

              console.log(
                transaction.vehicle_type === VehicleType.CAR
                  ? updateWashCount(customer?.car_wash_service_count || [])
                  : customer?.car_wash_service_count,
              );

              await this.customerModel.findByIdAndUpdate(
                transaction.customer_id,
                {
                  points: customerPoints,
                  car_wash_service_count:
                    transaction.vehicle_type === VehicleType.CAR
                      ? updateWashCount(customer?.car_wash_service_count || [])
                      : customer?.car_wash_service_count,
                  moto_wash_service_count:
                    transaction.vehicle_type === VehicleType.MOTORCYCLE
                      ? updateWashCount(customer?.moto_wash_service_count || [])
                      : customer?.moto_wash_service_count,
                },
              );
            }
          }

          await this.transactionModel.findByIdAndUpdate(transaction_id, {
            status: TransactionStatus.COMPLETED,
            check_out: new Date(),
          });
          return new SuccessResponse({ transaction: { _id: transaction._id } });
        }
      } else {
        throw new NotFoundException(
          new ErrorResponse(404, [
            { field: 'transaction_id', message: 'Transaction does not exist' },
          ]),
        );
      }
    }

    throw new BadRequestException(
      new ErrorResponse(400, [
        { field: 'status', message: 'Updating transaction is not allowed' },
      ]),
    );
  }

  async createAvailedService(
    id: ObjectIdDto['transaction_id'],
    createAvailedServiceDto: CreateAvailedServiceDto,
  ) {
    const { service_id, service_charge } = createAvailedServiceDto;
    const employeeShare = createAvailedServiceDto.price * 0.4;

    const service = await this.serviceModel.findById(service_id);
    if (!service) {
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'service_id', message: 'Service does not exist' },
        ]),
      );
    }

    const isAvailedServiceExist = await this.transactionModel.findOne({
      _id: id,
      'availed_services.service_id': service._id,
    });

    if (isAvailedServiceExist) {
      throw new BadRequestException(
        new ErrorResponse(400, [
          {
            field: 'service_id',
            message: 'Service cannot be multiple inside one transaction',
          },
        ]),
      );
    }

    const updatedTransaction = await this.transactionModel.findByIdAndUpdate(
      id,
      {
        $push: {
          availed_services: {
            _id: new Types.ObjectId(),
            service_id: new Types.ObjectId(service_id),
            price: createAvailedServiceDto.price,
            discount:
              service_charge === ServiceCharge.FREE
                ? createAvailedServiceDto.price
                : 0,
            deduction: 0,
            company_earnings:
              service_charge === ServiceCharge.FREE
                ? 0
                : createAvailedServiceDto.price - employeeShare,
            employee_share: employeeShare,
            assigned_employee_id: [],
            start_date: null,
            end_date: null,
            status: AvailedServiceStatus.PENDING,
            is_free: service_charge === ServiceCharge.FREE,
            is_paid: service_charge === ServiceCharge.FREE,
          },
        },
      },
      { new: true },
    );

    if (updatedTransaction) {
      return new SuccessResponse({
        transaction: { _id: updatedTransaction._id },
      });
    }

    throw new NotFoundException(
      new ErrorResponse(404, [
        { field: 'transaction_id', message: 'Transaction does not exist' },
      ]),
    );
  }

  async getTransactionAvailedService(
    transaction_id: ObjectIdDto['transaction_id'],
    availed_service_id: ObjectIdDto['availed_service_id'],
  ) {
    const transaction = await this.transactionModel
      .findById(transaction_id)
      .populate({
        path: 'availed_services.service_id',
        select: 'title image',
      })
      .populate({
        path: 'availed_services.assigned_employee_id',
        model: 'Employee',
        select: 'first_name last_name gender',
      })
      .lean()
      .exec();

    if (!transaction)
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'transaction_id', message: 'Transaction does not exist' },
        ]),
      );

    const availedService = transaction.availed_services.find(
      (service: AvailedServiceWithId) =>
        service._id.toString() === availed_service_id?.toString(),
    );

    if (!availedService)
      throw new NotFoundException(
        new ErrorResponse(404, [
          {
            field: 'availed_service_id',
            message: 'Transaction availed service does not exist',
          },
        ]),
      );

    let image = '';
    let title = '';
    if (!(availedService.service_id instanceof Types.ObjectId)) {
      image = availedService.service_id.image;
      title = availedService.service_id.title;
    }

    return new SuccessResponse({
      transaction: {
        _id: transaction_id,
        availed_service_id: availed_service_id,
        image: image,
        title: title,
        price: availedService.price,
        deduction: availedService.deduction,
        discount: availedService.discount,
        company_earnings: availedService.company_earnings,
        employee_share: availedService.employee_share,
        status: availedService.status,
        is_free: availedService.is_free,
        is_paid: availedService.is_paid,
        start_date: availedService.start_date,
        end_date: availedService.end_date,
        assigned_employees: availedService.assigned_employee_id,
      },
    });
  }

  async updateAvailedService(
    transaction_id: ObjectIdDto['transaction_id'],
    availed_service_id: ObjectIdDto['availed_service_id'],
    updateAvailedServiceDto: UpdateAvailedServiceDto,
  ) {
    if (updateAvailedServiceDto.assigned_employees) {
      const employeesExist = await Promise.all(
        updateAvailedServiceDto.assigned_employees.map(async (id) => {
          return this.employeeModel.exists({ _id: id });
        }),
      );

      if (employeesExist.includes(null)) {
        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'assigned_employees',
              message: 'One or more assigned employees do not exist.',
            },
          ]),
        );
      }
    }

    const transaction = (await this.transactionModel.findById(
      transaction_id,
    )) as TransactionWithId;

    if (transaction) {
      const availedService = transaction?.availed_services.find(
        (item: AvailedServiceWithId) =>
          item._id.toString() === availed_service_id?.toString(),
      );

      if (availedService) {
        const {
          status,
          deduction,
          discount,
          assigned_employees,
          is_free,
          is_paid,
        } = updateAvailedServiceDto;
        const profit = availedService.price - deduction;
        const employeeShare = profit * 0.4;
        const companyEarningsComputedValue = profit - employeeShare - discount;
        const companyEarnings =
          companyEarningsComputedValue > 0 ? companyEarningsComputedValue : 0;

        const assignedEmployeeIds = assigned_employees?.map(
          (id) => new Types.ObjectId(id),
        );

        const updateFields: Record<string, any> = {
          'availed_services.$.deduction': deduction,
          'availed_services.$.discount': is_free
            ? availedService.price
            : discount,
          'availed_services.$.company_earnings': is_free ? 0 : companyEarnings,
          'availed_services.$.employee_share': employeeShare,
          'availed_services.$.assigned_employee_id': assignedEmployeeIds,
          'availed_services.$.status': status,
          'availed_services.$.is_free': is_free,
          'availed_services.$.is_paid': is_free ? true : is_paid,
        };

        if (status === AvailedServiceStatus.PENDING) {
          updateFields['availed_services.$.start_date'] = null;
          updateFields['availed_services.$.end_date'] = null;
        }
        if (status === AvailedServiceStatus.ONGOING) {
          updateFields['availed_services.$.start_date'] = new Date();
          updateFields['availed_services.$.end_date'] = null;
        }
        if (status === AvailedServiceStatus.DONE) {
          updateFields['availed_services.$.end_date'] = new Date();
        }

        if (status === AvailedServiceStatus.CANCELLED) {
          updateFields['availed_services.$.deduction'] = 0;
          updateFields['availed_services.$.discount'] = 0;
          updateFields['availed_services.$.company_earnings'] = 0;
          updateFields['availed_services.$.employee_share'] = 0;
          updateFields['availed_services.$.assigned_employee_id'] = [];
          updateFields['availed_services.$.start_date'] = null;
          updateFields['availed_services.$.end_date'] = null;
          updateFields['availed_services.$.is_free'] = false;
          updateFields['availed_services.$.is_paid'] = false;
        }

        const updatedTransaction = await this.transactionModel.findOneAndUpdate(
          {
            _id: transaction_id,
            'availed_services._id': new Types.ObjectId(availed_service_id),
          },
          { $set: updateFields },
          { new: true },
        );

        return new SuccessResponse({
          transaction: {
            _id: updatedTransaction?._id,
            availed_service: { _id: availed_service_id },
          },
        });
      }

      throw new NotFoundException(
        new ErrorResponse(404, [
          {
            field: 'availed_service_id',
            message: 'Availed service does not exist',
          },
        ]),
      );
    }

    throw new NotFoundException(
      new ErrorResponse(404, [
        { field: 'transaction_id', message: 'Transaction does not exist' },
      ]),
    );
  }

  async getRecentTransactions(
    type: 'customer' | 'employee',
    id: Types.ObjectId,
  ) {
    const currentDate = new Date();
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    const filter: FilterQuery<TransactionDocument> = {
      status: TransactionStatus.COMPLETED,
      check_out: {
        $gte: sevenDaysAgo,
        $lte: currentDate,
      },
      availed_services: {
        $elemMatch: {
          status: AvailedServiceStatus.DONE,
        },
      },
    };

    if (type === 'customer') {
      filter.customer_id = new Types.ObjectId(id);
    } else {
      filter.availed_services = {
        $elemMatch: {
          assigned_employee_id: new Types.ObjectId(id),
          status: AvailedServiceStatus.DONE,
        },
      };
    }

    const transactions = await this.transactionModel
      .find(filter)
      .populate<{ availed_services: AvailedServiceWithPopulatedService[] }>({
        path: 'availed_services.service_id',
        select: 'title',
      })
      .sort({ check_out: 'desc' });

    const formattedTransaction: TransactionAvailedService[] = [];

    transactions.forEach((transaction) => {
      transaction.availed_services.forEach((service) => {
        const { title } = service.service_id;

        formattedTransaction.push({
          transaction_id: transaction._id.toString(),
          transaction_availed_service_id: service._id.toString(),
          service_name: title,
          price: service.price,
          date: transaction.check_out!,
        });
      });
    });

    return { transactions: formattedTransaction };
  }
}
